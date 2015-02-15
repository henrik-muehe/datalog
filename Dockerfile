FROM ubuntu:14.04
MAINTAINER Henrik Mühe <henrik.muehe@gmail.com>

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update

# Fake upstart
#RUN dpkg-divert --local --rename --add /sbin/initctl
#RUN ln -s /bin/true /sbin/initctl

# Install node
RUN apt-get -y install software-properties-common python-software-properties python g++ make
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get -y install nodejs

# Install tmux, wget, unzip
RUN apt-get -y install tmux wget unzip

# Install swi-pl
RUN cd /tmp ; wget http://www.swi-prolog.org/download/stable/src/pl-6.2.6.tar.gz
RUN cd /tmp; tar zxf pl-6.2.6.tar.gz
RUN cd /tmp/pl-6.2.6 ; ./configure --prefix=/opt/swi-prolog && make && make install

# Install des
RUN cd /tmp ; wget "http://downloads.sourceforge.net/project/des/des/des3.3.1/DES3.3.1SWI.zip?r=http%3A%2F%2Fwww.fdi.ucm.es%2Fprofesor%2Ffernan%2Fdes%2Fhtml%2Fdownload.html&ts=1375872797&use_mirror=switch"
RUN cd /opt ; unzip /tmp/DES*
RUN cd /opt/des ; echo '/opt/swi-prolog/bin/swipl -g "ensure_loaded(des)"' >> des
RUN cd /opt/des ; chmod 755 des

# Install src and modules
ADD . /src
RUN cd /src ; make install
RUN cd /src ; make

# Run
EXPOSE 8080
CMD ["/src/startup.sh"]
